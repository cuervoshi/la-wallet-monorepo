'use client';

import { SatoshiV2Icon } from '@bitcoin-design/bitcoin-icons-react/filled';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Container from '@/components/Layout/Container';
import TokenList from '@/components/TokenList';
import { Button, Divider, Feedback, Flex, Heading, Icon, InputWithLabel, Keyboard, Text } from '@/components/UI';
import { regexComment } from '@/constants/constants';
import { useTranslation } from '@/context/TranslateContext';
import { useActionOnKeypress } from '@/hooks/useActionOnKeypress';
import useErrors from '@/hooks/useErrors';
import { useNumpad } from '@/hooks/useNumpad';
import theme from '@/styles/theme';
import { useWalletContext, decimalsToUse, formatToPreference } from '@lawallet/react';
import { TransferTypes } from '@lawallet/react/types';

export const SelectTransferAmount = ({ transferInfo, setAmountToPay, setComment }) => {
  const { lng, t } = useTranslation();

  const [commentFocus, setCommentFocus] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const {
    user: { balance },
    settings: {
      props: { currency: userCurrency, hideBalance },
    },
    converter: { pricesData, convertCurrency },
  } = useWalletContext();

  const maxAvailableAmount: number = useMemo(() => {
    const convertedAmount: number = convertCurrency(balance.amount, 'SAT', userCurrency);

    return convertedAmount;
  }, [pricesData, balance.amount, userCurrency]);

  const numpadData = useNumpad(userCurrency, maxAvailableAmount);
  const errors = useErrors();
  const router = useRouter();

  const handleClick = () => {
    if (loading) return;
    if (!transferInfo.data) router.push('/transfer');

    setLoading(true);

    const satsAmount: number =
      numpadData.intAmount['SAT'] > balance.amount ? balance.amount : numpadData.intAmount['SAT'];

    if (transferInfo.type === TransferTypes.LUD16 && transferInfo.payRequest) {
      const mSats = satsAmount * 1000;
      const { minSendable, maxSendable } = transferInfo.payRequest;

      if (mSats < minSendable! || mSats > maxSendable!) {
        errors.modifyError('INVALID_SENDABLE_AMOUNT', {
          minSendable: (minSendable! / 1000).toString(),
          maxSendable: (maxSendable! / 1000).toString(),
          currency: 'SAT',
        });

        setLoading(false);
        return;
      }
    }

    setAmountToPay(satsAmount);
    router.push(
      `/transfer/lnurl/summary?data=${transferInfo.data}&amount=${satsAmount}${transferInfo.comment ? `&comment=${transferInfo.comment}` : ''}`,
    );
  };

  const handleChangeComment = (text: string) => {
    if (!text.length) {
      setComment('');
      return;
    }

    if (text.length > 255 || (transferInfo.payRequest && text.length > transferInfo.payRequest.commentAllowed)) {
      errors.modifyError('COMMENT_MAX_LENGTH', {
        chars: (transferInfo.payRequest?.commentAllowed ?? 255).toString(),
      });
      return;
    }

    const isValidComment = regexComment.test(text);
    if (!isValidComment) {
      errors.modifyError('ERROR_ON_COMMENT');
      return;
    }

    setComment(text);
  };

  useEffect(() => {
    if (transferInfo.amount && transferInfo.amount !== numpadData.intAmount['SAT']) {
      const convertedAmount: number =
        convertCurrency(transferInfo.amount, 'SAT', userCurrency) * 10 ** decimalsToUse(userCurrency);

      numpadData.updateNumpadAmount(convertedAmount.toString());
    }
  }, [pricesData]);

  useActionOnKeypress('Enter', handleClick, [numpadData, transferInfo]);

  return (
    <>
      <Container size="small">
        <Divider y={16} />
        <Flex direction="column" gap={8} flex={1} justify="center">
          <Flex justify="center" align="center" gap={4}>
            {userCurrency === 'SAT' ? (
              <Icon size="small">
                <SatoshiV2Icon />
              </Icon>
            ) : (
              <Text>$</Text>
            )}
            <Heading>{formatToPreference(userCurrency, numpadData.intAmount[numpadData.usedCurrency], lng)}</Heading>
          </Flex>

          {!hideBalance && (
            <Flex justify="center" align="center" gap={4}>
              <Heading as="h6" color={theme.colors.gray50}>
                {userCurrency !== 'SAT' && '$'}
                {formatToPreference(userCurrency, maxAvailableAmount, lng)} {t('AVAILABLE')}.
              </Heading>
            </Flex>
          )}

          <TokenList />

          {transferInfo.payRequest && (
            <Flex justify="center">
              <Feedback show={true} status={'success'}>
                {t('SENDABLE_AMOUNT', {
                  minSendable: formatToPreference('SAT', transferInfo.payRequest.minSendable! / 1000, lng),
                  maxSendable: formatToPreference('SAT', transferInfo.payRequest.maxSendable! / 1000, lng),
                })}
              </Feedback>
            </Flex>
          )}
        </Flex>

        <Feedback show={errors.errorInfo.visible} status={'error'}>
          {errors.errorInfo.text}
        </Feedback>

        <Divider y={24} />
        <Flex gap={16} align="end">
          <Flex direction="column" align="end">
            {/* POC: integrate message */}
            <InputWithLabel
              label={t('MESSAGE')}
              name="message"
              placeholder={t('OPTIONAL')}
              onChange={(e) => handleChangeComment(e.target.value)}
              value={transferInfo.comment}
              onFocus={() => setCommentFocus(true)}
              onBlur={() => setCommentFocus(false)}
            />
          </Flex>
          <Flex>
            <Button
              onClick={handleClick}
              disabled={loading || balance.amount === 0 || numpadData.intAmount['SAT'] === 0}
              loading={loading}
            >
              {t('CONTINUE')}
            </Button>
          </Flex>
        </Flex>
        <Divider y={24} />

        <Keyboard numpadData={numpadData} disableKeydown={commentFocus} />

        <Divider y={32} />
      </Container>
    </>
  );
};